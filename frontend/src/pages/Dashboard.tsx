import React from 'react'
import { Link } from 'react-router-dom'
import { PlusIcon, FolderIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useQuery } from 'react-query'
import { Project } from '@/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const Dashboard: React.FC = () => {
  const { data: projects, isLoading } = useQuery<Project[]>(
    'projects',
    async () => {
      const response = await fetch(`${API_BASE_URL}/projects`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      })
      if (!response.ok) throw new Error('Failed to fetch projects')
      const result = await response.json()
      return result.projects
    }
  )

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <h1 className="text-3xl font-bold text-gray-900">CanvasAI</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center">
                <PlusIcon className="h-4 w-4 mr-2" />
                New Project
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Projects</h2>
          
          {!projects || projects.length === 0 ? (
            <div className="text-center py-12">
              <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No projects</h3>
              <p className="mt-1 text-sm text-gray-500">Get started by creating a new project.</p>
              <div className="mt-6">
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium">
                  <PlusIcon className="h-4 w-4 mr-2 inline" />
                  New Project
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/editor/${project.id}`}
                  className="group bg-white rounded-lg shadow hover:shadow-md transition-shadow"
                >
                  <div className="aspect-video bg-gray-100 rounded-t-lg flex items-center justify-center">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.title}
                        className="w-full h-full object-cover rounded-t-lg"
                      />
                    ) : (
                      <div className="text-gray-400">
                        <FolderIcon className="h-12 w-12" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Updated {new Date(project.updatedAt).toLocaleDateString()}
                    </p>
                    {project.collaborators.length > 1 && (
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <UserGroupIcon className="h-3 w-3 mr-1" />
                        {project.collaborators.length} collaborators
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default Dashboard
